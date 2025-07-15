import stateMachine from '../src';

interface User {
  state: 'inactive' | 'active' | 'banned';
}

const sm = stateMachine({
  states: ['inactive', 'active', 'banned'] as const,
  transitions: {
    activate: { from: 'inactive', to: 'active' },
    deactivate: { from: 'active', to: 'inactive' },
    ban: { from: ['inactive', 'active'], to: 'banned' },
  },
  getState: (user: User) => new Promise<User['state']>((resolve) => {
    setTimeout(() => {
      resolve(user.state);
    });
  }),
  setState: (user: User, state) => new Promise<void>((resolve) => {
    setTimeout(() => {
      user.state = state;
      resolve();
    });
  }),
});

describe('stateMachine.apply (async)', () => {
  test('should apply a valid transition', async () => {
    const user: User = {
      state: 'inactive',
    };
    const promise = sm.apply('activate', user);
    expect(promise).toBeInstanceOf(Promise);
    await promise;
    expect(user.state).toEqual('active');
  });

  test('should apply a valid transition where "from" supports multiple states', async () => {
    const user: User = {
      state: 'active',
    };
    const promise = sm.apply('ban', user);
    expect(promise).toBeInstanceOf(Promise);
    await promise;
    expect(user.state).toEqual('banned');
  });

  test('should throw an error on invalid transition', async () => {
    expect.assertions(3);
    const user: User = {
      state: 'active',
    };

    const promise = sm.apply('activate', user);
    expect(promise).toBeInstanceOf(Promise);
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Transition activate can only be applied from state inactive; current state is active');
    }
  });

  test('should throw an error on invalid transition when "from" supports multiple states', async () => {
    expect.assertions(3);
    const user: User = {
      state: 'banned',
    };
    const promise = sm.apply('ban', user);
    expect(promise).toBeInstanceOf(Promise);
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Transition ban can only be applied from one of states [inactive, active]; current state is banned');
    }
  });
});