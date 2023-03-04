export const union = <S, T>(m1: Map<S, T>, m2: Map<S, T>): Map<S, T> =>
  new Map([...m1.entries(), ...m2.entries()]);

export const clone = <S, T>(m: Map<S, T>): Map<S, T> =>
  new Map([...m.entries()]);

export const map = <S, T, U>(m: Map<S, T>, f: (v: T) => U): Map<S, U> =>
  new Map([...m.entries()].map((v) => [v[0], f(v[1])]));

export const removeKeys = <S, T>(m: Map<S, T>, keys: Set<S>): Map<S, T> => {
  const result = clone(m);

  for (const key of keys) {
    result.delete(key);
  }

  return result;
};
