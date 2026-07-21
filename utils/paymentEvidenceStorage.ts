import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const DIR_NAME = 'payment-evidence';

function evidenceDir(): string {
  return `${documentDirectory ?? ''}${DIR_NAME}/`;
}

/** Copy a camera temp URI into app document storage; returns persistent file URI. */
export async function persistPaymentEvidence(tempUri: string): Promise<string> {
  const dir = evidenceDir();
  if (!documentDirectory) {
    return tempUri;
  }

  const info = await getInfoAsync(dir);
  if (!info.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }

  const extMatch = tempUri.match(/\.(jpe?g|png|webp|heic)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const dest = `${dir}pay-${Date.now()}.${ext}`;
  await copyAsync({ from: tempUri, to: dest });
  return dest;
}
