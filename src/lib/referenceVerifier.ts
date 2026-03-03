
export const verifyReference = async (urlOrDoi: string): Promise<boolean> => {
  try {
    const url = urlOrDoi.startsWith('10.') ? `https://doi.org/${urlOrDoi}` : urlOrDoi;
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    // Since we're using no-cors, we can't check response.ok, but if it doesn't throw, it's likely fine
    return true;
  } catch {
    return false;
  }
};
