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
  getState: (user: User) => user.state,
  setState: (user: User, state) => { user.state = state; },
});

describe('stateMachine.apply', () => {
  test('should apply a valid transition', () => {
    const user: User = {
      state: 'inactive',
    };
    const result = sm.apply('activate', user);
    expect(result).toBeUndefined();
    expect(user.state).toEqual('active');
  });

  test('should apply a valid transition where "from" supports multiple states', () => {
    const user: User = {
      state: 'active',
    };
    const result = sm.apply('ban', user);
    expect(result).toBeUndefined();
    expect(user.state).toEqual('banned');
  });

  test('should throw an error on invalid transition', () => {
    const user: User = {
      state: 'active',
    };
    expect(() => {
      sm.apply('activate', user);
    }).toThrow('Transition activate can only be applied from state inactive; current state is active');

  });

  test('should throw an error on invalid transition when "from" supports multiple states', () => {
    const user: User = {
      state: 'banned',
    };
    expect(() => {
      sm.apply('ban', user);
    }).toThrow('Transition ban can only be applied from one of states [inactive, active]; current state is banned');
  });
});