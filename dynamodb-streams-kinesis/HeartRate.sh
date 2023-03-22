x=1
while ((x <= 5))
do
  SensorID=$(( ( RANDOM % 5 )  + 1 ))
  HeartRate=$(jot -r 1 60 140)
  Epoch=$(date +%s)
  date1=$(date +%T)
  date2=$(date +%D)
  Date="${date2}${date1}"
  echo "$SensorID,$HeartRate,$Date"
  aws dynamodb put-item --table-name heartrate-ddb --item '{"id":{"S":'\"$Epoch\"'},"HeartRate":{"S":'\"$HeartRate\"'},"SensorID":{"S":'\"$SensorID\"'},"ReportTime":{"S":'\"$Date\"'}}' --return-consumed-capacity TOTAL --region us-east-1
  (( x = x + 1 ))
done