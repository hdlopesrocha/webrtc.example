var webSocket;
var streams = {};

var mediaRequest = {
	audio:true,
	video:true
};

var constraints ={ mandatory: { OfferToReceiveAudio: true, OfferToReceiveVideo: true } };

function askPermissionsToShare(){
 
	AdapterJS.webRTCReady(function(isUsingPlugin) {
		navigator.getUserMedia(mediaRequest, function(stream) {
        		onStreamArrived('self', stream);
        		startSignalingProtocol();
		}, console.log);
	});
}

function startSignalingProtocol(){
	webSocket.sendJson({
		type:'info'
	});
}

function createPeerConnection(id){
	var pc = new RTCPeerConnection({
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

    pc.onicecandidate = function(event) {
		if (event.candidate) {
			webSocket.sendJson({
				to: id,
            	type : "iceCandidate",
				content : event.candidate
			});
		}
	};

    pc.onaddstream = function (e) {
		onStreamArrived(id, e.stream);
	};

    pc.oniceconnectionstatechange = function() {
		if(peerConnection.iceConnectionState === 'disconnected') {
			$('#stream-'+id).remove();
		}
	};
	return pc;
}

function onStreamArrived(id, stream){
    var html = '<video class="col-md-4" id="stream-'+id+'" autoplay="autoplay" ' + (id === 'self' ? 'muted' : '')+  '/>';
    var elem = $(html);
    $("#streamContainer").append(elem);
    elem[0].srcObject = stream;
    streams[id] = stream;
}

console.log = function(...args) {
    $("#log").append(JSON.stringify(args)+'<br>');
}

function createOffer(pc, id, stream){
    pc.addStream(stream);
    pc.createOffer(function (sdp) {
        pc.setLocalDescription(sdp, function() {
			webSocket.sendJson({
				to: id,
				type : "offer",
				content : sdp
			});
		}, console.log);
	}, console.log,constraints);
}

function createAnswer(pc, id, stream){
    pc.addStream(stream);
    pc.createAnswer(function (sdp) {
        pc.setLocalDescription(sdp, function() {
			webSocket.sendJson({
				to: id,
				type : "answer",
				content : sdp
			});
		}, console.log);
	}, console.log,constraints);
}

function wsurl(s) {
	var l = window.location;
	return ((l.protocol === "https:") ? "wss://" : "ws://") + l.hostname + (((l.port !== 80) && (l.port !== 443)) ? ":" + l.port : "") + s;
}

$( document ).ready(function() {
    var peerConnections = {};

	if ("WebSocket" in window){
		webSocket = new WebSocket(wsurl("/ws"));

		webSocket.onopen = function() {
			askPermissionsToShare();
		};

        webSocket.sendJson = function(message) {
            webSocket.send(JSON.stringify(message));
        };

		webSocket.onmessage = function (evt) {
			var received_msg = JSON.parse(evt.data);
            console.log(received_msg);

			switch(received_msg.type) {
				case 'info':
					if(streams['self']) {
						for(var i in received_msg.content.peers) {
							var peerId = received_msg.content.peers[i];
                            var pc = peerConnections[peerId];
                            if(!pc && peerId !== received_msg.to) {
                                pc = peerConnections[peerId] = createPeerConnection(peerId);
                                createOffer(pc, peerId, streams['self']);
                            }
                        }
					}
					break;
				case 'offer':
                    var pc = peerConnections[received_msg.from];
                    var rsd = new RTCSessionDescription(received_msg.content);
                    pc.setRemoteDescription(rsd, function(){
    					createAnswer(pc, received_msg.from, streams['self']);
					},console.log);
					break;
				case 'answer':
                    var pc = peerConnections[received_msg.from];
                    var rsd = new RTCSessionDescription(received_msg.content);
                    pc.setRemoteDescription(rsd, function(){

					},console.log);
					break;
				case  'iceCandidate':
                    var pc = peerConnections[received_msg.from];
                    var candidate = new RTCIceCandidate(received_msg.content);
                    pc.addIceCandidate(candidate, function() {

					}, console.log);
				break;
			}
		};

		webSocket.onclose = function() {

		};

		window.onbeforeunload = function(event) {
			webSocket.close();
		};
	}
	else {
	   alert("WebSocket NOT supported by your Browser!");
	}
});
