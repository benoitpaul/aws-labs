import { EventBridgeHandler } from "aws-lambda";
import { Order } from "../types/order";

export const handler: EventBridgeHandler<
  "order.completed",
  Order,
  void
> = async (event) => {
  console.log("complete order: ", event);
};
