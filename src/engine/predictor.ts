export default interface IPredictor {
  folderFor(header: string): string | null;
}
