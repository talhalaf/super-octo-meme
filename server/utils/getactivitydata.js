const request = require('request');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
//'Authorization':'Basic VG9rZW5BdXRoOjUyOGIwYmQyLTJiMzgtNGMxNC05ODc3LTVjNTZiYWZlM2JkNA==',
//'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'



let getActivityData = (activityId,token) => {
    // console.log(token);
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/activities/${activityId}?full_mode=true`,
            json:true,
            headers:{
                'Authorization':`Basic ${token}`,
                'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
            }
        },(error,response,body)=>{
           if(error || body.fault){
                reject(body.fault.faultstring);
           }
           resolve(body);
        });
    });
    
}

let getPDFFile = async (path,newPDFFilePath) => {
    puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(async browser => {
        const page = await browser.newPage();
        page.setViewport({
            height:1024,
            width:768
        });
        await page.goto('file:///'+path, {waitUntil: 'networkidle0'});
        await page.screenshot({path: 'screenshot.png'});
        await page.pdf({
            path: newPDFFilePath, 
            printBackground: true,
            format: 'A4',
            height: 1080,
            width:1920 
        }).then();
        // await page.content().then(res=>{
        //   console.log(res);
        // });
        await browser.close();
      }).catch(e=>{
        console.log(e);
    });
}
let getPDFData = async (activityId,token) =>{
    let PDFObject = {};
    let activityData = await getActivityData(activityId,token);
    let accountRef = activityData.Account.Data;
    PDFObject.TSAFormLogic = activityData.TSAFormLogic;

    let questionsMeta = PDFObject.TSAFormLogic.split(',');    
    //trimming (removing spaces) all strings
    questionsMeta = questionsMeta.map(questionString => 
        questionString.trim().split(':').map(fieldName=> fieldName.trim()));
    // PDFObject.questionsMeta=questionsMeta;
    PDFObject.questions = [];
    let i = 0;
    for (let question of questionsMeta){
        PDFObject.questions[i] = { 
            question: activityData['TSA'+question[0]],
            expectedValue: question[1],
            answer: activityData['TSA'+question[0]+'Answer'],
            points: question[2],
            picture1: activityData['TSA'+question[3]],
            picture2: activityData['TSA'+question[4]]
        }
        i++;
    }
    PDFObject.ActivityID = activityData.InternalID;
    PDFObject.AccountName = accountRef.Name;
    PDFObject.AccountID = accountRef.ExternalID;
    PDFObject.Address = accountRef.Street + ', ' + accountRef.City + ', ' + accountRef.Country;
    PDFObject.ActionDateTime = activityData.ActionDateTime;
    PDFObject.AgentName = activityData.Agent.Data.FirstName +' '+ activityData.Agent.Data.LastName;
    // PDFObject.questions = [];
    // for(let i=1;i<=11;i++){
    //     PDFObject.questions.push({
    //         question: activityData['TSAQ'+i],
    //         answer: activityData['TSAQ'+i+'Yes'],
    //         points: activityData['TSAQ'+i+'Points']
    //     });
    // }
    if (!activityData)
        reject("bla bla");
    fs.writeFileSync('activityData.json',JSON.stringify(activityData,undefined,2));

    return PDFObject;
}
let getPDFObject = async (activityId,token) =>  {
    let PDFObject = await getPDFData(activityId,token);
    await fs.writeFileSync(path.join(__dirname ,'..',activityId+'.json'),JSON.stringify(PDFObject,undefined,2));

    // let JSfile = path.join(__dirname ,'..','template.js');
    let HTMLfile = path.join(__dirname , '..', 'backup.html');
    // let JSdata = fs.readFileSync(JSfile); //read existing JS template into data
    let HTMLdata = fs.readFileSync(HTMLfile);
    // let newJSData = 'const PDFObject = ' + JSON.stringify(PDFObject,undefined,2) +';\n'+ JSdata;
    let newHTMLData = `\n <script>const PDFObject = ${JSON.stringify(PDFObject,undefined,2)} </script>` + HTMLdata ;
    // let newJSPath = path.join(__dirname ,'..','/template'+transactionId+'.js');
    let newHTMLPath = path.join(__dirname ,'..','/template'+activityId+'.html');
    let newPDFFilePath = path.join(__dirname ,'..','/template'+activityId+'.pdf');
    // await fs.writeFileSync(newJSPath,newJSData);
    await fs.writeFileSync(newHTMLPath,newHTMLData);
    // // or fs.appendFile(fd, data);
    await getPDFFile(newHTMLPath,newPDFFilePath);
    PDFObject.newPDFFilePath = newPDFFilePath;
    return PDFObject;    
}

getPDFObject(50587028,'VG9rZW5BdXRoOjg0Yjk0ZWNiLTYxZjktNDI5NS04YzY2LWJmYzMzMzZmOGVjNQ==');
module.exports.getPDFObject = getPDFObject;