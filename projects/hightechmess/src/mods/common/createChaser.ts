import chaser from 'chaser';

export const createChaser = (initialValue: number, duration: number) => {
  return chaser({ initialValue, duration });
}