export const difference = <S>(s1: Set<S>, s2: Set<S>): Set<S> =>
  new Set([...s1].filter((element) => !s2.has(element)));

export const flatUnion = <S>(ss: Array<Set<S>>): Set<S> =>
  new Set(ss.map((s) => [...s]).flat());

export const toArray = <S>(s: Set<S>): Array<S> => [...s];
