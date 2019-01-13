import IJsonObject from '../types/json';
import Box from './box';

export default interface IPredictor {
  addHeaders(header: string, qualifiedBoxName: string): void;
  considerBox(box: Box): void;
  folderFor(headers: string): string | null;
  name(): string;
  removeHeaders(headers: string, qualifiedBoxName: string): void;
  stateFromHeaders(headers: string): IJsonObject;
}
