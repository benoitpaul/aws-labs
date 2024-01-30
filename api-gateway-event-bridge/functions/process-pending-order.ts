import { EventBridgeHandler } from "aws-lambda";
import { Order } from "../types/order";

export const handler: EventBridgeHandler<"order.pending", Order, void> = async (
  event
) => {
  console.log("pending order: ", event);
};
