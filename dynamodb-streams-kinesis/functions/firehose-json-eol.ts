import {
  FirehoseTransformationHandler,
  FirehoseTransformationResultRecord,
} from "aws-lambda";

export const handler: FirehoseTransformationHandler = async (event) => {
  /* Process the list of records and transform them */
  const output: FirehoseTransformationResultRecord[] = event.records.map(
    (record) => {
      let entry = Buffer.from(record.data, "base64").toString("utf8");
      let result = entry + "\n";
      const payload = Buffer.from(result, "utf8").toString("base64");
      return {
        ...record,
        data: payload,
        result: "Ok",
      };
    }
  );
  return { records: output };
};
