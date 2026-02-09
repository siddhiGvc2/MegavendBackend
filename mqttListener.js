const { mqttEvents, sendMessage } = require('./mqtt');
const {orders,deviceStatus} = require('./orderStore');

mqttEvents.on('message', (topic, message) => {
  console.log('MQTT RX:', topic, message);

  // *machineId,txnId,amount#
  if (!message.startsWith('*') || !message.endsWith('#')) return;

  const payload = message.slice(1, -1).split(',');
    if(payload[0]){
    deviceStatus[payload[0]] = new Date().toISOString();
  }
  if(payload[1]=="MVSTATUS"){
    if(orders[payload[2]]){
       console.log('Updating order status for', payload[2]);
         const spiralStatuses = orders[payload[2]]?.items.slice(0, 5).map((item,i) => ({
        x: item.x,
        y: item.y,
        status: payload[i+3] === '1' ? 1 : 0
      }));
      console.log('Parsed MQTT message for MVSTATUS:', { machineId: payload[0], txn_id: payload[2], spiralStatuses });
     if(orders[payload[2]])
{
    orders[payload[2]].status =
      payload[8] === "C"
        ? "completed"
        : payload[8] === "P"
        ? "pending"
        : "failed";

      orders[payload[2]].spiral_statuses = spiralStatuses;
}
    }
  }
  console.log(payload[0],payload[1],payload[2]);
  if(payload[2]=="KBDKReceived" || payload[2]=="AmountReceived" || payload[2]=="DuplicateIDReceived"){
  const [machineId, txn_id, amountReceived] = payload;
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
  if(amountReceived=="DuplicateIDReceived")
  {
    console.log(`Duplicate txn_id: '${txn_id}' already exists. Please use a new, unique txn_id.`);
    if(orders[txn_id]){
     orders[txn_id].status = "duplicate";
    }
  }
  else if(amountReceived == "KBDKReceived"){

    //  orders[payload[2]].status = 'SUCCESS';
     const spiralStatuses = orders[txn_id]?.items.map((item) => ({
        x: item.x,
        y: item.y,
        status: 0
      }));
      if(orders[txn_id])
      {
      orders[txn_id].status = "pending";
      orders[txn_id].spiral_statuses = spiralStatuses;
      }

  }
  else if(amountReceived=="AmountReceived"){
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
  console.log('Current', orders);
  
  // if (!orders[txn_id]) return;
  // if(orders[txn_id].status === 'SUCCESS') return;

 
  console.log(`Order ${txn_id} updated to SUCCESS`);
  //   console.log('Updated Order:', orders[txn_id]);
  sendMessage(`HB/${machineId}`, `*SUCCESS#`);
    // build kbd values based on items length
    const kbds = orders[txn_id]?.items.map(item => `${item.x}${item.y}`);

    // join with comma
    const kbdString = kbds?.join(',');

    sendMessage(
      `HB/${machineId}`,
      `*KBDK${txn_id},${kbdString}#`
    );
  }
}

});
