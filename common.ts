import pino from 'pino';

export const Logger = (outfile = 'out') => pino({
  level: 'debug',
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: {
          destination: `${outfile}_out.log`
        }
      },
      {
        target: 'pino/file',
        options: { destination: 1 }
      }
    ]
  }
});

const logger = Logger('common');

export const fetchWithRetry = async (url: string, retry = 0): Promise<Response> => {
  const delay = 500;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });
    if (!response.ok) {
      const resp = await response.text();
      throw new Error(`Request failed with status ${response.status}. Response: ${resp}`);
    }
    return response;
  } catch (error) {
    if (retry < 3) {
      logger.info(`Request ${url} failed, ${retry} retry after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * (retry + 1)));
      return fetchWithRetry(url, retry + 1);
    }
    throw error;
  }
}

export const htmlEntities = (str: string) => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
