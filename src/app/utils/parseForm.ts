import formidable from 'formidable';

export const parseForm = (req: Request): Promise<{ fields: any; files: any }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });

    // @ts-ignore: req is not of type IncomingMessage, but works
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

export const config = {
  api: {
    bodyParser: false,
  },
};
