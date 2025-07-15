import stateMachine from '../src';

interface User {
  state: 'inactive' | 'active' | 'banned';
}

describe('Guards for stateMachine.apply', () => {
  test('When guards are defined, the result of stateMachine.apply() is always a Promise', () => {
    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      guards: {},
    });

    const user: User = {
      state: 'inactive',
    };

    const result = sm.apply('activate', user);
    expect(result).toBeInstanceOf(Promise);
  });

  test('Correct guards are called with synchronous state getter', async () => {
    const guardCalls: boolean[] = [];

    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      // pushing true - that guard should be called
      // pushing false - these guards shouldn't be called
      guards: {
        all: [
          () => { guardCalls.push(true); },
          async () => { guardCalls.push(true); },
        ],
        transitions: {
          activate: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          deactivate: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          ban: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
        },
        fromState: {
          inactive: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
          active: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          banned: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
        },
        toState: {
          inactive: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          active: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          banned: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
        }
      },
    });

    const user: User = {
      state: 'inactive',
    };
    await sm.apply('ban', user);
    expect(guardCalls).toHaveLength(8);
    expect(guardCalls.reduce((a, b) => a && b)).toStrictEqual(true);
  });

  test('Correct guards are called with asynchronous state getter', async () => {
    const guardCalls: boolean[] = [];

    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => new Promise<User['state']>((resolve) => setTimeout(() => resolve(user.state))),
      setState: (user: User, state) => { user.state = state; },
      // pushing true - that guard should be called
      // pushing false - these guards shouldn't be called
      guards: {
        all: [
          () => { guardCalls.push(true); },
          async () => { guardCalls.push(true); },
        ],
        transitions: {
          activate: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          deactivate: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          ban: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
        },
        fromState: {
          inactive: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
          active: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          banned: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
        },
        toState: {
          inactive: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          active: [
            () => { guardCalls.push(false); },
            async () => { guardCalls.push(false); },
          ],
          banned: [
            () => { guardCalls.push(true); },
            async () => { guardCalls.push(true); },
          ],
        }
      },
    });

    const user: User = {
      state: 'inactive',
    };
    await sm.apply('ban', user);
    expect(guardCalls).toHaveLength(8);
    expect(guardCalls.reduce((a, b) => a && b)).toStrictEqual(true);
  });

  test('Guards are not called on invalid transition', async () => {
    let guardCallsCount: number = 0;

    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      guards: {
        all: [
          () => { guardCallsCount++; },
        ],
        transitions: {
          activate: [
            () => { guardCallsCount++; },
          ],
          deactivate: [
            () => { guardCallsCount++; },
          ],
          ban: [
            () => { guardCallsCount++; },
          ],
        },
        fromState: {
          inactive: [
            () => { guardCallsCount++; },
          ],
          active: [
            () => { guardCallsCount++; },
          ],
          banned: [
            () => { guardCallsCount++; },
          ],
        },
        toState: {
          inactive: [
            () => { guardCallsCount++; },
          ],
          active: [
            () => { guardCallsCount++; },
          ],
          banned: [
            () => { guardCallsCount++; },
          ],
        }
      },
    });

    const user: User = {
      state: 'banned',
    };

    expect.assertions(1);
    try {
      await sm.apply('ban', user);
    } catch (error) {
      expect(guardCallsCount).toStrictEqual(0);
    }
  });

  test('Throwing exception when a guard returns an error', async () => {
    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      guards: {
        all: [
          () => 'Test error',
        ],
      },
    });

    const user: User = {
      state: 'active',
    };

    expect.assertions(2);
    try {
      await sm.apply('ban', user);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Test error');
    }
  });

  test('Throwing exception when a guard returns an error (async)', async () => {
    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      guards: {
        all: [
          () => new Promise<string>((resolve) => setTimeout(() => resolve('Test error')))
        ],
      },
    });

    const user: User = {
      state: 'active',
    };

    expect.assertions(2);
    try {
      await sm.apply('ban', user);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Test error');
    }
  });

  test('Guards are running in order and stop on first reported error', async () => {
    let firstGuardCalled = false;
    let secondGuardCalled = false;

    const sm = stateMachine({
      states: ['inactive', 'active', 'banned'] as const,
      transitions: {
        activate: { from: 'inactive', to: 'active' },
        deactivate: { from: 'active', to: 'inactive' },
        ban: { from: ['inactive', 'active'], to: 'banned' },
      },
      getState: (user: User) => user.state,
      setState: (user: User, state) => { user.state = state; },
      guards: {
        all: [
          () => new Promise<string>((resolve) => setTimeout(() => {
            firstGuardCalled = true;
            resolve('Test error');
          }))
        ],
        transitions: {
          ban: [
            () => new Promise<string>((resolve) => setTimeout(() => {
              secondGuardCalled = true;
              resolve('Test error');
            }))
          ]
        }
      },
    });

    const user: User = {
      state: 'active',
    };

    expect.assertions(2);
    try {
      await sm.apply('ban', user);
    } catch (error) {
      expect(firstGuardCalled).toStrictEqual(true);
      expect(secondGuardCalled).toStrictEqual(false);
    }
  });
});