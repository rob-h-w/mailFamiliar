import Box from './box';
import IJsonObject from '../types/json';

export default interface IPredictor {
  addHeaders(header: string, qualifiedBoxName: string): void;
  considerBox(box: Box): void;
  folderScore(headers: string): Map<string, number>;
  name(): string;
  removeHeaders(headers: string, qualifiedBoxName: string): void;
  stateFromHeaders(headers: string): IJsonObject;
}
