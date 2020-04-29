import Persistence from './persistence';

export default interface Model {
  persist(persistence: Persistence): Promise<void>;
  restore(persistence: Persistence): Promise<void>;
}
