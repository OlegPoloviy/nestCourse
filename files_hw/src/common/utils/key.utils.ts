export function generateProductKey(
  productId: string,
  extension: string,
): string {
  const cleanExtension = extension.replace(/^\./, '');
  return `products/${productId}/images/${crypto.randomUUID()}.${cleanExtension}`;
}
