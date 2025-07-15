type StringValueArray = readonly string[];
type OneOf<Array extends StringValueArray> = Array[number];

type SingleTransitionDefinition<States extends StringValueArray> = { from: OneOf<States> | OneOf<States>[], to: OneOf<States>; };
type TransitionsRecord<States extends StringValueArray, Transitions extends string> = Record<Transitions, SingleTransitionDefinition<States>>;

type MaybePromise<T> = T | Promise<T>;

type ApplyResult<A extends MaybePromise<unknown>, B extends MaybePromise<unknown>> = (A extends Promise<unknown> ? Promise<void> : (B extends Promise<unknown> ? Promise<void> : void));
type TestResult<A extends MaybePromise<unknown>> = A extends Promise<unknown> ? Promise<boolean> : boolean;

type TransitionGuard<Entity, Transition extends string, States extends StringValueArray> = (_: {
  entity: Entity,
  transition: Transition,
  from: OneOf<States>,
  to: OneOf<States>;
}) => MaybePromise<string | null | void>;

type TransitionGuardMap<Entity, Transitions extends string, States extends StringValueArray> = undefined | {
  all?: TransitionGuard<Entity, Transitions, States>[];
  transitions?: {
    [transitionName in Transitions]?: TransitionGuard<Entity, Transitions, States>[];
  },
  fromState?: {
    [satteName in OneOf<States>]?: TransitionGuard<Entity, Transitions, States>[];
  },
  toState?: {
    [satteName in OneOf<States>]?: TransitionGuard<Entity, Transitions, States>[];
  },
};

type StateMachineConfig<
  Entity,
  States extends StringValueArray,
  Transitions extends string,
  TransitionsDefinition extends TransitionsRecord<States, Transitions>,
  GetState extends MaybePromise<OneOf<States>>,
  SetState extends MaybePromise<void>,
> = {
  states: States;
  transitions: TransitionsDefinition;
  getState: (entity: Entity) => GetState;
  setState: (entity: Entity, state: OneOf<States>) => SetState;
  guards: TransitionGuardMap<Entity, Transitions, States>;
};

// Utility type: If Guards is undefined, use original result type; otherwise, always Promise
type ApplyResultWithGuards<A extends MaybePromise<unknown>, B extends MaybePromise<unknown>, Guards> =
  Guards extends undefined ? ApplyResult<A, B> : Promise<void>;
type TestResultWithGuards<A extends MaybePromise<unknown>, Guards> =
  Guards extends undefined ? TestResult<A> : Promise<boolean>;

interface StateMachine<
  Entity,
  States extends StringValueArray,
  Transitions extends string,
  GetState extends MaybePromise<OneOf<States>>,
  SetState extends MaybePromise<void>,
  Guards extends TransitionGuardMap<Entity, Transitions, States>
> {
  apply: (transition: Transitions, entity: Entity) => ApplyResultWithGuards<GetState, SetState, Guards>;
  can: (transition: Transitions, entity: Entity) => TestResultWithGuards<GetState, Guards>;
};

class StateMachineImpl<
  Entity,
  States extends StringValueArray,
  Transitions extends string,
  TransitionsDefinition extends TransitionsRecord<States, Transitions>,
  GetState extends MaybePromise<OneOf<States>>,
  SetState extends MaybePromise<void>,
  Guards extends TransitionGuardMap<Entity, Transitions, States>
> implements StateMachine<Entity, States, Transitions, GetState, SetState, Guards> {
  private readonly config: StateMachineConfig<Entity, States, Transitions, TransitionsDefinition, GetState, SetState> & { guards?: Guards; };

  constructor(config: StateMachineConfig<Entity, States, Transitions, TransitionsDefinition, GetState, SetState> & { guards?: Guards; }) {
    this.config = config;
  }

  apply(transition: Transitions, entity: Entity): any {
    const guardsDefined = this.config.guards !== undefined;
    if (!(transition in this.config.transitions)) {
      throw new Error(`${transition} is not a valid transition name; allowed transitions: ${Object.keys(this.config.transitions).join(', ')}`);
    }
    const currentState = this.config.getState(entity);
    if (guardsDefined) {
      return Promise.resolve(currentState).then((result) => {
        return this.applyTransitionWithInitialState(transition, entity, result);
      });
    }
    if (currentState instanceof Promise) {
      return currentState.then(async (result) => {
        await this.applyTransitionWithInitialState(transition, entity, result);
      });
    }
    else {
      return this.applyTransitionWithInitialState(transition, entity, currentState as OneOf<States>);
    }
  }

  private applyTransitionWithInitialState(transition: Transitions, entity: Entity, initialState: OneOf<States>): void | Promise<void> {
    const { to } = this.config.transitions[transition];
    const transitionError = this.getApplyTransitionWithInitialStateError(transition, initialState);
    if (transitionError !== null) {
      throw new Error(transitionError);
    }

    const guards = this.getGuards(transition, initialState, to);
    if (guards.length > 0) {
      return this.getFirstErrorFromGuardsPromise(guards, entity, transition, initialState, to)
        .then(async (guardError: string | null) => {
          if (guardError !== null) {
            throw new Error(guardError);
          }

          await this.config.setState(entity, to);
        });
    }

    return this.config.setState(entity, to);
  }

  can(transition: Transitions, entity: Entity): any {
    const guardsDefined = this.config.guards !== undefined;
    if (!(transition in this.config.transitions)) {
      throw new Error(`${transition} is not a valid transition name; allowed transitions: ${Object.keys(this.config.transitions).join(', ')}`);
    }
    const currentState = this.config.getState(entity);
    if (guardsDefined) {
      return Promise.resolve(currentState).then((result) => {
        return this.testApplyWithInitialState(transition, entity, result);
      });
    }
    if (currentState instanceof Promise) {
      return currentState.then(async (result) => {
        return this.testApplyWithInitialState(transition, entity, result);
      });
    } else {
      return this.testApplyWithInitialState(transition, entity, currentState as OneOf<States>);
    }
  }

  private testApplyWithInitialState(transition: Transitions, entity: Entity, initialState: OneOf<States>): MaybePromise<boolean> {
    const { to } = this.config.transitions[transition];
    const transitionError = this.getApplyTransitionWithInitialStateError(transition, initialState);
    if (transitionError !== null) {
      return false;
    }

    const guards = this.getGuards(transition, initialState, to);
    if (guards.length === 0) {
      return true;
    }

    return this.getFirstErrorFromGuardsPromise(guards, entity, transition, initialState, to)
      .then(async (guardError: string | null) => {
        return guardError === null;
      });
  }

  private getApplyTransitionWithInitialStateError(transition: Transitions, initialState: OneOf<States>): string | null {
    const { from } = this.config.transitions[transition];
    if (typeof from === 'string' && from !== initialState) {
      return `Transition ${transition} can only be applied from state ${from}; current state is ${initialState}`;
    }
    if (Array.isArray(from) && !from.includes(initialState)) {
      return `Transition ${transition} can only be applied from one of states [${from.join(', ')}]; current state is ${initialState}`;
    }
    return null;
  }

  private async getFirstErrorFromGuardsPromise(
    guards: TransitionGuard<Entity, Transitions, States>[],
    entity: Entity,
    transition: Transitions,
    from: OneOf<States>,
    to: OneOf<States>
  ): Promise<string | null> {
    for (const guard of guards) {
      const guardResult = await Promise.resolve(guard({ entity, transition, from, to }));
      if (typeof guardResult === 'string') {
        return guardResult;
      }
    }
    return null;
  }

  private getGuards(transition: Transitions, from: OneOf<States>, to: OneOf<States>): TransitionGuard<Entity, Transitions, States>[] {
    return [
      ...(this.config.guards?.all ?? []),
      ...(this.config.guards?.transitions?.[transition] ?? []),
      ...(this.config.guards?.fromState?.[from] ?? []),
      ...(this.config.guards?.toState?.[to] ?? []),
    ];
  }
}

export default function stateMachine<
  Entity,
  States extends StringValueArray,
  TDef extends TransitionsRecord<States, any>,
  GetState extends MaybePromise<OneOf<States>>,
  SetState extends MaybePromise<void>,
  Guards extends TransitionGuardMap<Entity, Extract<keyof TDef, string>, States>
>(
  config: {
    states: States;
    transitions: TDef;
    getState: (entity: Entity) => GetState;
    setState: (entity: Entity, state: OneOf<States>) => SetState;
    guards?: Guards;
  }
): StateMachine<
  Entity,
  States,
  Extract<keyof TDef, string>,
  GetState,
  SetState,
  Guards
> {
  return new StateMachineImpl(config as any);
}