import { DynamoDBBatchItemFailure, DynamoDBStreamHandler } from "aws-lambda";
import {
  AttributeValue,
  DynamoDBClient,
  ReturnValue,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const { INVOICE_TOTAL_TABLE } = process.env;

export const handler: DynamoDBStreamHandler = async (event) => {
  // const batchItemFailures: DynamoDBBatchItemFailure[] = [];
  for (const record of event.Records) {
    //try {
    if (record.dynamodb && record.dynamodb.NewImage) {
      const newImage = unmarshall(
        record.dynamodb.NewImage as { [key: string]: AttributeValue }
      );

      await ddbDocClient.send(
        new UpdateCommand({
          TableName: INVOICE_TOTAL_TABLE,
          Key: { InvoiceNumber: newImage["InvoiceNumber"] },
          UpdateExpression: `SET #Total = if_not_exists(#Total, :initial) + :num, #UpdateDate = :date`,
          ExpressionAttributeNames: {
            "#Total": "Total",
            "#UpdateDate": "UpdateDate",
          },
          ExpressionAttributeValues: {
            ":num": newImage["Amount"],
            ":initial": 0,
            ":date": newImage["InvoiceDate"],
          },
          ReturnValues: ReturnValue.UPDATED_NEW,
        })
      );
    }
    // } catch (err) {
    //   console.log("Error", err);
    //   if (record.eventID) {
    //     batchItemFailures.push({ itemIdentifier: record.eventID });
    //   }
    // }
  }

  //   const response = { batchItemFailures };
  //   console.log("Response", response);
  //   return response;
};
