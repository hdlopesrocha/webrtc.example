package cern.fap.ais.pm.webrtc;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.TreeMap;

@Component
public class
SocketHandler extends TextWebSocketHandler {

	Map<String, WebSocketSession> sessions = new TreeMap<>();
	private final ObjectMapper mapper = Jackson2ObjectMapperBuilder.json().build();

	@Override
    public void handleTextMessage(final WebSocketSession session, final TextMessage textMessage)
			throws InterruptedException, IOException {
		System.out.println(session.getId() + ":"+ textMessage.getPayload());
		Message message = mapper.readValue(textMessage.getPayload(),Message.class);
		message.setFrom(session.getId());

		TextMessage newMessage = new TextMessage(mapper.writeValueAsString(message));

		if(message.getTo() == null) {
			for (WebSocketSession webSocketSession : sessions.values()) {
				if (!session.equals(webSocketSession)) {
					synchronized(webSocketSession){
						webSocketSession.sendMessage(newMessage);
					}
				}
			}
		} else {
			WebSocketSession webSocketSession = sessions.get(message.getTo());
			synchronized(webSocketSession){
				webSocketSession.sendMessage(newMessage);
			}
		}
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		sessions.put(session.getId(), session);
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
		sessions.remove(session.getId());
	}
}
