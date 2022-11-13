import { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event, context) => {
  for (const record of event.Records) {
    // process the record
    console.log("Dead-letter Record: %j", record);
    const body = JSON.parse(record.body) as {
      Subject: string;
      Message: string;
    };
    const message = { subject: body.Subject, message: body.Message };
    console.log("Dead-letter Message: %j", message);
  }
};
