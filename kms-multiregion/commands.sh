
# encrypt the file message: us-east-1
aws kms encrypt --plaintext fileb://secret-message.txt --key-id <YOUR_MRK_KEY> --region us-east-1 --output text --query CiphertextBlob | base64 --decode > secret-message.enc

# decrypt the encoded file with us-east-1
aws kms decrypt --ciphertext-blob fileb://secret-message.enc --key-id <YOUR_MRK_KEY> --region us-east-1 --output text --query Plaintext | base64 --decode > secret-message-us-east-1.dec

# decrypt the encoded file with ca-central-1: does not work!
aws kms decrypt --ciphertext-blob fileb://secret-message.enc --key-id <YOUR_MRK_KEY> --region ca-central-1 --output text --query Plaintext | base64 --decode > secret-message-ca-central-1.dec

# decrypt encoded file with eu-west-1
aws kms decrypt --ciphertext-blob fileb://secret-message.enc --key-id <YOUR_MRK_KEY> --region eu-west-1 --output text --query Plaintext | base64 --decode > secret-message-eu-west-1.dec
