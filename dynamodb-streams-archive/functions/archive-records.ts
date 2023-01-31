import { DynamoDBStreamHandler } from "aws-lambda";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from "@aws-sdk/client-firehose";

const { DELIVERY_STREAM_NAME } = process.env;

const firehoseClient = new FirehoseClient({});

export const handler: DynamoDBStreamHandler = async (event) => {
  const recordsToStream = event.Records.filter(
    (record) => record.dynamodb?.OldImage
  ).map((record) => {
    console.log(`Event name: ${record.eventName}`);
    const oldImage = unmarshall(
      record.dynamodb!.OldImage as { [key: string]: AttributeValue }
    );
    console.log({ oldImage });
    return {
      Data: Buffer.from(JSON.stringify(oldImage)),
    };
  });

  if (recordsToStream.length > 0) {
    console.log(
      `Sending ${recordsToStream.length} records to firehose ${DELIVERY_STREAM_NAME}...`
    );

    await firehoseClient.send(
      new PutRecordBatchCommand({
        DeliveryStreamName: DELIVERY_STREAM_NAME,
        Records: recordsToStream,
      })
    );

    console.log(`Sent records to firehose`);
  } else {
    console.log("There are no records to send to firehose");
  }
};
