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
			throws IOException {
		System.out.println(textMessage.toString());
		Message message = mapper.readValue(textMessage.getPayload(), Message.class);

		if(message.getType().equals("info")) {
			message.setTo(session.getId());
			message.setContent(new TreeMap<String, Object>() {{
				put("peers", sessions.keySet());
			}});
			session.sendMessage( new TextMessage(mapper.writeValueAsString(message)));
		} else {
			message.setFrom(session.getId());
			WebSocketSession webSocketSession = sessions.get(message.getTo());
			synchronized(webSocketSession){
				webSocketSession.sendMessage(new TextMessage(mapper.writeValueAsString(message)));
			}
		}
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		sessions.put(session.getId(), session);
		System.out.println(session.getId());

	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		sessions.remove(session.getId());
	}
}
