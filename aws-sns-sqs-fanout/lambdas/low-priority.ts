import { SQSHandler, SQSBatchItemFailure } from "aws-lambda";
// import { DynamoDB } from "aws-sdk";

// const dbClient = new DynamoDB.DocumentClient();

export const handler: SQSHandler = async (event, context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  event.Records.forEach((record) => {
    try {
      console.log("Low Priority Record: %j", record);
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  });
  return { batchItemFailures };
};
