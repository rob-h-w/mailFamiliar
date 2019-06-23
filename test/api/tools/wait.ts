export default function waitATick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
