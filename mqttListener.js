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
         const spiralStatuses = orders[payload[2]].items.map((item,i) => ({
        x: item.x,
        y: item.y,
        status: payload[i+3] === '1' ? 1 : 0
      }));
      orders[payload[2]].status = "pending";
      orders[payload[2]].spiral_statuses = spiralStatuses;
    }
  }
  console.log(payload[0],payload[1],payload[2]);
  if(payload[2]=="KBDKReceived" || payload[2]=="AmountReceived"){
  const [machineId, txn_id, amountReceived] = payload;
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
 
  if(amountReceived == "KBDKReceived"){

    //  orders[payload[2]].status = 'SUCCESS';
     const spiralStatuses = orders[txn_id].items.map((item) => ({
        x: item.x,
        y: item.y,
        status: 0
      }));
      orders[txn_id].status = "pending";
      orders[txn_id].spiral_statuses = spiralStatuses;

  }
  if(amountReceived=="AmountReceived"){
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
  console.log('Current', orders);
  
  // if (!orders[txn_id]) return;
  // if(orders[txn_id].status === 'SUCCESS') return;

 
  console.log(`Order ${txn_id} updated to SUCCESS`);
//   console.log('Updated Order:', orders[txn_id]);
  sendMessage(`HB/${machineId}`, `*SUCCESS#`);
// build kbd values based on items length
const kbds = orders[txn_id].items.map(item => `${item.x}${item.y}`);

// join with comma
const kbdString = kbds.join(',');

sendMessage(
  `HB/${machineId}`,
  `*KBDK${txn_id},${kbdString}#`
);
  }
}

});
