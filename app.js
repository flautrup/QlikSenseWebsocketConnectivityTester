//Setup
var xrfkey="0123456789abcdef";
var hasFocus=true;
var protocol=location.protocol;
var host=location.hostname;
//Add support for virtual proxy. Need to not access the hub without the virtual proxy.
var path=location.pathname;
var regexpResults=/([\w\d-]*)\/content/i.exec(path);
if (regexpResults!=null) {
  var virtualProxy=regexpResults[1];
} else {
  var virtualProxy="";
}


if (protocol=="https:") {
  var isSecure=true;
  document.getElementById("ConnectedWSDiv").style.display='none';
  document.getElementById("DocListWSDiv").style.display='none';
  document.getElementById("ProductVersionWSDiv").style.display='none';
} else {
  var isSecure=false;
}

authenticate = function (virtualProxy) {
  xmlhttp=new XMLHttpRequest();

  xmlhttp.onreadystatechange=function() {
    if (xmlhttp.readyState==4 && xmlhttp.status==200) {
      document.getElementById("Authenticated").innerHTML="Authenticated";
      document.getElementById("AuthenticatedDiv").classList.remove('alert-danger');
      document.getElementById("AuthenticatedDiv").classList.add('alert-success');
      document.getElementById("AuthenticatedIcon").classList.remove('glyphicon-ban-circle');
      document.getElementById("AuthenticatedIcon").classList.add('glyphicon-ok-circle');
    } else if (xmlhttp.readyState==4) {
      document.getElementById("Authenticated").innerHTML="Authentication error "+xmlhttp.status.toString()+" "+xmlhttp.responseText;
    }
  }

  if(virtualProxy!="") {
    var reqString="/"+virtualProxy+"/hub?xrfkey="+xrfkey;
  } else {
    var reqString="/hub?xrfkey="+xrfkey;
  }

  xmlhttp.open("GET",reqString,true);
  xmlhttp.setRequestHeader('x-qlik-xrfkey', xrfkey);
  xmlhttp.send();
}

//Test web socket configuration
testWS = function (config) {
  if(config.isSecure) {
    var connectElement="ConnectedWSS";
    var docListElement="DocListWSS";
    var productVersionElement="ProductVersionWSS";
    var connectionType ="WSS";
  } else {
    var connectElement="ConnectedWS";
    var docListElement="DocListWS";
    var productVersionElement="ProductVersionWS";
    var connectionType ="WS";
  }

  qsocks.Connect(config).then(function(global) {
      console.log(global)
      document.getElementById(connectElement).innerHTML="Connected "+connectionType;
      document.getElementById(connectElement+"Div").classList.remove('alert-danger');
      document.getElementById(connectElement+"Div").classList.add('alert-success');
      document.getElementById(connectElement+"Icon").classList.remove('glyphicon-ban-circle');
      document.getElementById(connectElement+"Icon").classList.add('glyphicon-ok-circle');

      //Get server version
      global.productVersion().then(function(productVersion) {
        document.getElementById(productVersionElement).innerHTML="Connected to "+productVersion+" retrieved using "+connectionType;
        document.getElementById(productVersionElement+"Div").classList.remove('alert-danger');
        document.getElementById(productVersionElement+"Div").classList.add('alert-success');
        document.getElementById(productVersionElement+"Icon").classList.remove('glyphicon-ban-circle');
        document.getElementById(productVersionElement+"Icon").classList.add('glyphicon-ok-circle');

      }, function (err) {
        document.getElementById(productVersionElement).innerHTML="Failed to get productVersion "+err+" using "+connectionType;
      });

      //Get document list
      global.getDocList().then(function(docList) {
        var nbrOfDoc=docList.length.toString();
        document.getElementById(docListElement).innerHTML="Application list of "+nbrOfDoc+" applications retrieved using "+connectionType;
        document.getElementById(docListElement+"Div").classList.remove('alert-danger');
        document.getElementById(docListElement+"Div").classList.add('alert-success');
        document.getElementById(docListElement+"Icon").classList.remove('glyphicon-ban-circle');
        document.getElementById(docListElement+"Icon").classList.add('glyphicon-ok-circle');
      }, function (err) {
        document.getElementById(docListElement).innerHTML="Failed to get application list "+err+" using "+connectionType;
      });
  }, function (err) {
      document.getElementById(connectElement).innerHTML="Connection failed "+err;
  });
}

window.onfocus = function() {
    hasFocus = true;
};

window.onblur = function() { hasFocus = false; };

chartReposeTime=function (config) {
  var labels=[];
  var values=[];

  var data = {
    labels: labels,
    datasets: [
        {
            label: "Response Time",
            fillColor: "rgba(220,220,220,0.2)",
            strokeColor: "#4C8C2B",
            pointColor: " #5F6062",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: values
        }
    ]
  };

  var ctx = document.getElementById("Chart").getContext("2d");
  var myNewChart = new Chart(ctx).Line(data, {responsive: true, scaleStartValue:0, scaleBeginAtZero: true});


  var trackResponse = new Array();

  qsocks.Connect(config).then(function(global) {
    setInterval(function () {
      if(hasFocus) {
        var startTime=new Date(); //Start
        //Get server version
        global.productVersion().then(function(productVersion) {
          var endTime=new Date();
          var responseTime=endTime.getTime()-startTime.getTime();
          trackResponse.push(responseTime);
          console.log(responseTime);

          myNewChart.addData([responseTime],"");
          if (myNewChart.datasets[0].points.length>90) {
            myNewChart.removeData();
          }

        }, function (err) {
          myNewChart.addData([0],"Error");
          if (myNewChart.datasets[0].points.length>90) {
            myNewChart.removeData();
          }
        });
      }

    },1000);

  })
}


if (isSecure) {
  //if HTTPS only test WSS
  var configWSS = {
      host: host,
      isSecure: true,
      rejectUnauthorized: true,
      prefix: virtualProxy ? "/"+virtualProxy : ''
  };

  authenticate(virtualProxy);
  testWS(configWSS);
  chartReposeTime(configWSS);
} else {
  //if HTTP test WS and WSS
  authenticate(virtualProxy);
  var configWS = {
      host: host,
      isSecure: false,
      prefix: virtualProxy ? "/"+virtualProxy : ''
  };

  testWS(configWS)

  var configWSS = {
      host: host,
      isSecure: true,
      rejectUnauthorized: true,
      prefix: virtualProxy ? "/"+virtualProxy : ''
  };

  testWS(configWSS);
  chartReposeTime(configWS);
}