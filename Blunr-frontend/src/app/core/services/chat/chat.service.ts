import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatSelectionService } from '../../../shared/components/chatbot/chat-selection.service';
// import { Router } from '@angular/router';
// import { ToastrService } from 'ngx-toastr';

type ChatMessage = {
  chatRoom: string;
  sender: string;
  receiver: string;
  text: string;
  media: any[];
};

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(
    private readonly http: HttpClient,
    private readonly chatSelectionService: ChatSelectionService
    // private readonly router: Router,
    // private readonly toast: ToastrService
  ) {}

  getUserChatRooms() {
    return this.http.get('/chat/getUserChatRooms');
  }
  getRoomMessages(id: string) {
    return this.http.get(`/chat/messages/${id}`);
  }

  createChatRoom(data: { members: string[]; admin: string }) {
    return this.http.post('/chat/createChatRoom', data);
  }

  sendMessage(
    message: string,
    form: FormData,
    senderReciever: { sender: string; receiver: string; chatRoom: string }
  ): Observable<any> {
    const payload: Omit<ChatMessage, 'media'> = {
      ...senderReciever,
      text: message,
    };

    Object.keys(payload).forEach((key) => {
      console.log('form keys  : ', key, '   :    ', payload[key as keyof typeof payload]);

      form.append(key, payload[key as keyof typeof payload]);
    });

    return this.http.post('/chat/messages', form);
  }

  getChatRoomById(id: string) {
    return this.http.post('/chat/getRoomById', { id });
  }

  sendTip(payload: {
    chatRoom: string;
    sender: string;
    receiver: string;
    amount: number;
    note?: string;
  }) {
    const text = payload.note
      ? `sent you a tip of $${payload.amount}: ${payload.note}`
      : `sent you a tip of $${payload.amount}`;

    const formData = new FormData();
    formData.append('isLocked', 'false');

    return this.sendMessage(text, formData, {
      chatRoom: payload.chatRoom,
      sender: payload.sender,
      receiver: payload.receiver,
    });
  }

  markRoomAsRead(roomId: string) {
    return this.http.put(`/chat/messages/read-room/${roomId}`, {});
  }
}
