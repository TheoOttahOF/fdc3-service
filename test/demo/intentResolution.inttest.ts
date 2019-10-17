import 'jest';
import 'reflect-metadata';

import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Intent} from './../../src/client/intents';
import {fin} from './utils/fin';
import * as fdc3Remote from './utils/fdc3RemoteExecution';
import {TestAppData, setupTeardown, setupQuitAppAfterEach, NonDirectoryTestAppData, quitApps} from './utils/common';
import {testManagerIdentity, testAppNotInDirectory1, testAppWithPreregisteredListeners1, testAppInDirectory2} from './constants';
import {IntentResolution, Context, ResolveError} from './../../src/client/main';
import {delay} from './utils/delay';

/**
 * Intent registered by `testAppWithPreregisteredListeners1` right after opening
 */
const preregisteredIntent: Intent = {
    type: 'test.IntentNamePreregistered',
    context: {type: 'preregistered.context'}
};
const appHandlingIntent: TestAppData = testAppWithPreregisteredListeners1;

setupTeardown();

type ContextListener = jest.Mock | (() => any);

type TestParam = [
    string,
    TestAppData,
    ContextListener | undefined,
    any // The value IntentResolution.data should resolve to
];

const testrun: TestParam[] = new Array(5).fill(null).map((_, i) => {
    return ['a literal', appHandlingIntent, () => 1, null];
});

const intentHandlingApp = appHandlingIntent;

describe('When an app has 1 window', () => {
    setupQuitAppAfterEach(intentHandlingApp);

    beforeEach(async () => {
        await openDirectoryApp(intentHandlingApp);
        await delay(1000);
    });
    test('The expected value is resolved', async () => {
        await fdc3Remote.addIntentListener(intentHandlingApp, preregisteredIntent.type);
        expect(raiseIntent(preregisteredIntent, intentHandlingApp)).resolves.toBe(undefined);
        // testExpectedResolution(resolution, null);
    });

    test('And has multiple intent handlers', async () => {
        await delay(40000);
        await fdc3Remote.addIntentListener(intentHandlingApp, preregisteredIntent.type);
        await delay(40000);
        // await fdc3Remote.addIntentListener(intentHandlingApp, preregisteredIntent.type);
        // await fdc3Remote.addIntentListener(intentHandlingApp, preregisteredIntent.type);

        await delay(5000);
        // await raiseIntent(preregisteredIntent, intentHandlingApp);
        expect(raiseIntent(preregisteredIntent, intentHandlingApp)).resolves.toBe(undefined);
        // testExpectedResolution(resolution, expectedValue);
    }, 10000000);
});

describe('Wait and read provider', () => {
    test('', async () => {
        await delay(30000);
    });
});

function testExpectedResolution(resolution: Promise<IntentResolution>, expectedValue: any) {
    if (expectedValue instanceof Error) {
        const errorRegex = new RegExp('Timeout');
        expect(resolution).rejects.toThrowError(errorRegex);
    } else {
        expect(resolution).resolves.toHaveProperty('data', expectedValue);
    }
}

function raiseIntent(intent: Intent, target: TestAppData): Promise<void> {
    return fdc3Remote.raiseIntent(
        testManagerIdentity,
        intent.type,
        intent.context,
        target.name
    );
}

function createDelayedFunction(fn: (...args: any[]) => any, time: number): () => Promise<any> {
    return async () => {
        await delay(time);
        return fn();
    };
}

async function createChildWindows(target: Identity, number: number): Promise<Identity[]> {
    const ids = new Array(number)
        .fill(null)
        .map((_, i) => fdc3Remote.createFinWindow(target, {name: `child-window-${i}`, url: 'http://localhost:3923/test/test-app.html'}));
    return Promise.all(ids);
}

async function openDirectoryApp(app: TestAppData) {
    await fdc3Remote.open(testManagerIdentity, app.name);
    return testManagerIdentity;
}

async function openNonDirectoryApp(app: NonDirectoryTestAppData): Promise<Identity> {
    return (await fin.Application.startFromManifest(app.manifestUrl)).identity;
}
