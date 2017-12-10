window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var HyperWebSocket = new (function() {
    var primaryStream = null;
    var localVideoHandler=null;
	var pc = null;
	var ws = null;
    var local_none = {offerToReceiveAudio:true,offerToReceiveVideo:true};
    var camera_user = {audio:true, video:true };
    var audio_constraints = { 'offerToReceiveAudio':true,'offerToReceiveVideo':true};
    var remote_constraints = { 'offerToReceiveAudio':true,'offerToReceiveVideo':true};


    // =================================================
    // ========== WEBRTC and RECEIVE MESSAGES ==========
    // =================================================

	this.start = function(groupId,mode,kscb) {

        function wsurl(s) {
            var l = window.location;
            return ((l.protocol === "https:") ? "wss://" : "ws://") + l.hostname + (((l.port != 80) && (l.port != 443)) ? ":" + l.port : "") + s;
        }

		if ("WebSocket" in window) {
			ws = new WebSocket(wsurl("/ws/room/" + groupId));

            ws.callbacks = [];
		    ws.onCmd = function(cmd,callback){
                ws.callbacks.push({cmd:cmd,callback:callback});
                return ws;
		    };

			ws.onerror = function() {
				console.log("Error!");
			};

			ws.onCmd('iceCandidate',function(message){
	            console.log(message);
				var candidate = new RTCIceCandidate(message.data);
				pc.addIceCandidate(candidate, function() {

				}, logError);
			});

		    ws.onCmd('answer',function(message){
                console.log(message);
                var rsd = new RTCSessionDescription(message.data);
                // XXX [CLIENT_OFFER_08] XXX
                pc.setRemoteDescription(rsd, function(){
                    // console.log("setRemoteSessionDescription",rsd);
                },logError);
			});

	        ws.onCmd('msg',function(message){
                for(var i in message.data){
                    var item = message.data[i];
                    console.log("msg",item);
                    if(messageArrivedHandler){
                        messageArrivedHandler(item.source,item.time,item.text,item.name, item.id, item.seq);
                    }
                }
			});

			ws.onmessage = function(data) {
				var message = JSON.parse(data.data);
				var cmd = message.cmd;

				for(var i in  ws.callbacks){
                    var item = ws.callbacks[i];
                    if(item.cmd == cmd){
                        item.callback(message);
                    }
				}
			};
			
			ws.onopen = function() {
				kscb();

                // XXX [CLIENT_ICE_01] XXX
                pc = new RTCPeerConnection({
                    iceServers : [
                        {
                            urls : "stun:stun.iptel.org"
                        },
                        {
                            urls : "stun:stun.ekiga.net"
                        },
                        {
                            urls : "stun:stun.fwdnet.net"
                        },
                        {
                            urls : "stun:stun.ideasip.com"
                        }
                    ]
                });

                // stun -i wlan0 -p 3478 -v citysdk.tagus.ist.utl.pt
                // stun -i wlan0 -p 19302 -v 64.233.184.127


                // XXX [CLIENT_ICE_02] XXX
                pc.onicecandidate = function(event) {
                    if (event.candidate) {
                        var msg = {
                            cmd : "iceCandidate",
                            candidate : event.candidate
                        }
                        // XXX [CLIENT_ICE_03] XXX
                        ws.send(JSON.stringify(msg));
                    }
                }

	            pc.onaddstream = function (e) {
					console.log(e);
					stq = e.stream;
					console.log(stq);
					if(remoteVideoHandler){
					    remoteVideoHandler(URL.createObjectURL(stq));
					}
				};

				// XXX [CLIENT_OFFER_01] XXX

				if(mode==0 || mode==1){
					navigator.mediaDevices.getUserMedia(mode==0 ? camera_user: screen_user).then(function(stream) {
                        if(localVideoHandler){
                            localVideoHandler(window.URL.createObjectURL(stream));
                        }
                        primaryStream = stream;
                        console.log(stream);
                        if(mode==0){
                            HyperWebSocket.audioFunction(stream);
                        }
                        pc.addStream(stream);
                        pc.createOffer(function (lsd) {
                            console.log("createOfferToSendReceive",lsd);
                            // XXX [CLIENT_OFFER_02] XXX
                            pc.setLocalDescription(lsd, function() {
                                // XXX [CLIENT_OFFER_03] XXX
                                ws.send(JSON.stringify({
                                    cmd : "offer",
                                    data : lsd
                                }));
                            }, logError);
                        }, logError,remote_constraints);
                    }.bind(this)).catch(console.log);
				}
				else if(mode==2){
					pc.createOffer(function (lsd) {
						console.log("createOfferToReceive",lsd);
						pc.setLocalDescription(lsd, function() {
							ws.send(JSON.stringify({
								cmd : "offer",
								data : lsd
							}));
						}, logError);
					}, logError,local_none);
				}
			};

			ws.onclose = function() {
				console.log("Connection is closed...");
			};
		
			window.onbeforeunload = function() {
				ws.close();
			}.bind(this);
		
		} else {
			console.log("no websocket support!");
		}
	};
	return this;
})();
