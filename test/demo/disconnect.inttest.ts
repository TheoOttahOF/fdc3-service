import 'jest';
import {Identity} from 'openfin/_v2/main';

import {AppWindow} from '../../src/provider/model/AppWindow';
import {Application} from '../../src/client/directory';

import * as fdc3Remote from './utils/fdc3RemoteExecution';
import {OFPuppeteerBrowser} from './utils/ofPuppeteer';
import {setupTeardown, quitApps} from './utils/common';
import {testManagerIdentity, testAppInDirectory1} from './constants';
import {RemoteChannel} from './utils/RemoteChannel';

setupTeardown();

const ofBrowser = new OFPuppeteerBrowser();
const TEST_INTENT = 'TestIntent';
let redChannel: RemoteChannel;
let blueChannel: RemoteChannel;

afterAll(async () => {
    await quitApps(testAppInDirectory1);
});

describe('Disconnecting windows', () => {
    beforeEach(async () => {
        await fdc3Remote.open(testManagerIdentity, testAppInDirectory1.name);
        redChannel = await fdc3Remote.getChannelById(testAppInDirectory1, 'red');
        blueChannel = await fdc3Remote.getChannelById(testAppInDirectory1, 'blue');
    });

    describe('When closing an application', () => {
        beforeEach(async () => {
            await fdc3Remote.addContextListener(testAppInDirectory1);
            await fdc3Remote.addEventListener(testAppInDirectory1, 'channel-changed');
            await fdc3Remote.addIntentListener(testAppInDirectory1, TEST_INTENT);
            await redChannel.join(testAppInDirectory1);
            await blueChannel.addContextListener();
            await blueChannel.addEventListener('window-added');
            await quitApps(testAppInDirectory1);
        });

        it('The window is removed from the model', async () => {
            expect(await getWindow(testAppInDirectory1)).toBeNull();
        });

        it('Intent listeners are removed', async () => {
            const intents = await getIntentListeners(TEST_INTENT);
            expect(intents).toEqual([]);
        });

        describe('Channels', () => {
            it('Channel has been left', async () => {
                expect(await windowIsNotInChannels(testAppInDirectory1)).toEqual(true);
            });

            it('Context listeners are removed', async () => {
                const contextListeners = await getChannelContextListeners(blueChannel);
                expect(contextListeners).toEqual([]);
            });

            it.todo('Event listeners are removed');
        });
    });

    describe('When navigating away from the page', () => {

    });
});

/**
 * Only get windows that are not ignored
*/
async function getWindow(identity: Identity): Promise<AppWindow | null> {
    return ofBrowser.executeOnProvider(function (id: Identity): AppWindow | null {
        return this.model.getWindow(id);
    }, identity);
}

async function getIntentListeners(intentType: string): Promise<Application[]> {
    return ofBrowser.executeOnProvider(function (type: string): Promise<Application[]> {
        return this.model.getApplicationsForIntent(type);
    }, intentType);
}

async function getChannelContextListeners(remoteChannel: RemoteChannel): Promise<AppWindow[]> {
    return ofBrowser.executeOnProvider(function (id: string): AppWindow[] {
        const channel = this.channelHandler.getChannelById(id);
        return this.channelHandler.getWindowsListeningForContextsOnChannel(channel);
    }, remoteChannel.channel.id);
}

type EventType = 'window-added' | 'window-removed';

async function getChannelEventListeners(remoteChannel: RemoteChannel, eventType: EventType): Promise<AppWindow[]> {
    return ofBrowser.executeOnProvider(function (id: string, event: EventType): AppWindow[] {
        const channel = this.channelHandler.getChannelById(id);
        return this.channelHandler.getWindowsListeningForEventsOnChannel(channel, event);
    }, remoteChannel.channel.id, eventType);
}

async function windowIsNotInChannels(identity: Identity): Promise<boolean> {
    return ofBrowser.executeOnProvider(function (id): boolean {
        const window = this.model.getWindow(id);
        return !this.model.channels.some(channel => {
            return this.channelHandler.getChannelMembers(channel).some(member => member === window);
        });
    }, identity);
}
