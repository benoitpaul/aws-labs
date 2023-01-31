let EXP=`date -j -f "%a %b %d %T %Z %Y" "\`date\`" "+%s"` 
# let PAST=$(($EXP - 100000))
aws dynamodb put-item \
    --table-name InvoiceTransactions \
    --item '{
      "InvoiceNumber": { "S": "FGHI" },
      "TransactionId": { "S": "456" },
      "Amount": { "N": "100" },
      "InvoiceDate": { "S": "06062016" },
      "Expiration": {"N": "'$EXP'"}
  }'