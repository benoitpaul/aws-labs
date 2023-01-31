aws dynamodb put-item \
    --table-name InvoiceTransactions \
    --item '{
      "InvoiceNumber": { "S": "ABC" },
      "TransactionId": { "S": "123" },
      "Amount": { "N": "100" },
      "Country": { "S": "USA" },
      "InvoiceDate": { "S": "06062016" },
      "InvoiceDoc": { "M": {
        "VendorName": { "S" : "Vendor1 Inc"},   
        "NumberOfItems": { "S": "5" } 
        }
    }
  }'

  aws dynamodb put-item \
    --table-name InvoiceTransactions \
    --item '{
      "InvoiceNumber": { "S": "ABC" },
      "TransactionId": { "S": "456" },
      "Amount": { "N": "300" },
      "Country": { "S": "Canada" },
      "InvoiceDate": { "S": "06062016" },
      "InvoiceDoc": { "M": {
        "VendorName": { "S" : "Vendor2 Inc"},   
        "NumberOfItems": { "S": "3" } 
        }
    }
  }'

