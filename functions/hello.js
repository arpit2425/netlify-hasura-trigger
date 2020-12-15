
const axios = require('axios');
const moment=require('moment');
const sub_package_query=`query vas_sub_packages($id: uuid){
  vas_sub_packages(where:{id:{_eq:$id}}){
    id
    duration
    services{
      service_id
    }
  }
}`
const insert_tracker=`mutation insertTracker($objects: [vas_subscription_tracker_insert_input!]! ) {
  insert_vas_subscription_tracker(objects: $objects) {
    returning {
      id
    }
  }
}`
const update_tracker=`mutation updateTracker($object: vas_subscription_tracker_set_input,$id:uuid!){
  update_vas_subscription_tracker(where:{sub_subscription_id:{_eq:$id}},_set:$object){
    affected_rows
    returning{
      id
    }
  }
}`;

exports.handler = async(event, context, cb) => {
  const adminSecret = process.env.ADMIN_SECRET;
  const hgeEndpoint = process.env.hgeEndpoint;
  try{
    const { event: {op, data}, table: {name, schema} } = JSON.parse(event.body);
  //const { event: {op, data}, table: {name, schema} } = event;
  
  let request;
  let {created_by,created_at,modified_at,modified_by,deleted,properties,id,log_remarks,start_date,end_date}=data.new;
  let payload={
    created_by,
    created_at,
    modified_at,
    modified_by,
    deleted,
    properties,
    sub_subscription_id:id,
    log_remarks,
    
  }
 
  if(op === 'INSERT'){
    const qv ={id:data.new.sub_package_id};
    let data1 = JSON.stringify({
      query: sub_package_query,
      variables: qv
    });
    
    let config = {
      method: 'post',
      url: hgeEndpoint,
      headers: { 
        'content-type': 'application/json', 
        'x-hasura-admin-secret': adminSecret
      },
      data : data1
    };
    
   const response=await axios(config);
   const res=response.data.data;
  console.log(res);
    

 const service_id=res.vas_sub_packages[0].services[0].service_id;
 const duration=res.vas_sub_packages[0].duration;
 payload.service_id=service_id;

    const freq=duration.split(":");
    let frequency;
    if(freq[0] == '01') frequency='M';
    else if(freq[1] == '01') frequency='w';
    else frequency='d';   
    const final_payload=[];
    while(moment(start_date).isSameOrBefore(end_date)){
      final_payload.push({...payload,service_date:start_date});
      start_date=moment(start_date, "YYYY-MM-DD").add(1, frequency).format("YYYY-MM-DD");
    }
    console.log("final payload ", final_payload);
   
    let insert_data = JSON.stringify({
      query:insert_tracker,
      variables: {objects:final_payload}
    });
    config.data=insert_data;
   const track= await axios(config);
    console.log(track.data);
    
   
  }
  else if(op=== 'UPDATE'){
    console.log(data);
    const id=data.old.id;
    console.log(id);
    let update_data=JSON.stringify({
      query:update_tracker,
      variables:{object:payload,id:id}
    });
    let config = {
      method: 'post',
      url: hgeEndpoint,
      headers: { 
        'content-type': 'application/json', 
        'x-hasura-admin-secret': adminSecret
      },
      data : update_data
    };
   const track= await axios(config);
    console.log(track.data);

  }


  cb(null, {
    statusCode: 200,
    body: "success"
  });
}
catch(err){
  console.log(err);
}
};
