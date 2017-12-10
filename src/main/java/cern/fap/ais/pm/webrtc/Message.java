package cern.fap.ais.pm.webrtc;

import java.util.Map;

/**
 * Created by hdlopesrocha on 07-12-2017.
 */
public class Message {

    private String from;
    private String to;
    private Map<String,String> content;
    private String type;

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Object getContent() {
        return content;
    }

    public void setContent(Map<String,String> content) {
        this.content = content;
    }
}
