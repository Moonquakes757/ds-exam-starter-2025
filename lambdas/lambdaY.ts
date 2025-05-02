import { SNSEvent, Context } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";Reject messages missing a name

const sqsClient = new SQSClient({ region: process.env.REGION });
const QUEUE_B_URL = process.env.QUEUE_B_URL!;

export const handler = async (event: SNSEvent, context: Context) => {
  try {
    console.log("Received SNS event:", JSON.stringify(event));

    for (const record of event.Records) {
      const msg = JSON.parse(record.Sns.Message);

      // Queue B Send to Queue B if missing email
      if (!msg.email) {
        console.log(`Message missing email, sending to QueueB:`, msg);
        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: QUEUE_B_URL,
            MessageBody: JSON.stringify(msg),
          })
        );
        continue;  // jump
      }

      console.log("Processing message with email:", msg.email);
    }
  } catch (err: any) {
    console.error("Error in LambdaY:", err);
    throw err;
  }
};
