import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isVerified: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatIconModule, MatChipsModule
  ],
  template: `
    <div style="min-height:100vh; background:#fafafa; display:flex; flex-direction:column;">

      <!-- AI Banner -->
      <div style="background:#e3f2fd; padding:10px 24px; display:flex; align-items:center; gap:12px;">
        <mat-icon style="color:#1a237e; font-size:20px;">smart_toy</mat-icon>
        <span style="color:#1a237e; font-size:0.875rem; font-weight:500;">
          هذه المحادثة مجهولة الهوية بالكامل وتتم معالجتها آلياً لضمان الخصوصية والمهنية
        </span>
      </div>

      <!-- Chat Header -->
      <div style="background:#1a237e; color:white; padding:16px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
        <div class="container">
          <div style="display:flex; align-items:center; gap:16px;">
            <button mat-icon-button style="color:white;" (click)="router.navigate(['/client'])">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div style="flex:1;">
              <h3 style="margin:0; font-size:1.125rem; font-weight:500;">محادثة مجهولة</h3>
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                <span style="font-size:0.8rem; opacity:0.9;">الطرف الأول ⟷ الطرف الثاني</span>
                <div style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.2); border-radius:12px; padding:2px 8px;">
                  <mat-icon style="font-size:12px; width:12px; height:12px;">verified_user</mat-icon>
                  <span style="font-size:0.7rem;">AI Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div style="flex:1; overflow:auto; padding:24px 0;" #messagesContainer>
        <div class="container">
          <mat-card style="box-shadow:0 1px 3px rgba(0,0,0,0.08)!important; padding:24px; margin-bottom:16px;">
            <div *ngFor="let msg of messages" style="margin-bottom:16px;">
              <div
                [style.justifyContent]="msg.sender === 'الطرف الأول' ? 'flex-end' : 'flex-start'"
                style="display:flex;">
                <div
                  [style.flexDirection]="msg.sender === 'الطرف الأول' ? 'row-reverse' : 'row'"
                  style="max-width:70%; display:flex; gap:8px; align-items:flex-start;">

                  <!-- Avatar -->
                  <div
                    [style.backgroundColor]="msg.sender === 'الطرف الأول' ? '#1a237e' : '#bdbdbd'"
                    style="width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:0.875rem; flex-shrink:0;">
                    {{ msg.sender === 'الطرف الأول' ? '١' : '٢' }}
                  </div>

                  <div>
                    <!-- Bubble -->
                    <div
                      [class]="msg.sender === 'الطرف الأول' ? 'chat-bubble-right' : 'chat-bubble-left'">
                      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                        <strong style="font-size:0.8rem; opacity:0.9;">{{ msg.sender }}</strong>
                        <mat-icon *ngIf="msg.isVerified"
                          [style.color]="msg.sender === 'الطرف الأول' ? 'rgba(255,255,255,0.7)' : '#3f51b5'"
                          style="font-size:13px; width:13px; height:13px;">verified_user</mat-icon>
                      </div>
                      <p style="margin:0; line-height:1.6;">{{ msg.text }}</p>
                      <!-- AI Badge -->
                      <div
                        [style.borderTopColor]="msg.sender === 'الطرف الأول' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'"
                        style="display:flex; align-items:center; gap:4px; margin-top:8px; padding-top:8px; border-top:1px solid;">
                        <mat-icon
                          [style.color]="msg.sender === 'الطرف الأول' ? 'rgba(255,255,255,0.6)' : '#9e9e9e'"
                          style="font-size:12px; width:12px; height:12px;">smart_toy</mat-icon>
                        <span
                          [style.color]="msg.sender === 'الطرف الأول' ? 'rgba(255,255,255,0.6)' : '#9e9e9e'"
                          style="font-size:0.7rem;">تمت المعالجة بواسطة AI</span>
                      </div>
                    </div>
                    <!-- Timestamp -->
                    <p
                      [style.textAlign]="msg.sender === 'الطرف الأول' ? 'right' : 'left'"
                      style="margin:4px 0 0; font-size:0.75rem; color:#9e9e9e;">
                      {{ msg.time }}
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Input Bar -->
      <div style="background:white; border-top:1px solid #e0e0e0; padding:16px 0;">
        <div class="container">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <mat-icon style="font-size:18px; color:#1a237e;">smart_toy</mat-icon>
            <span style="font-size:0.8rem; color:#9e9e9e;">جميع الرسائل تتم معالجتها آلياً للحفاظ على الخصوصية والحيادية</span>
          </div>
          <div style="display:flex; gap:8px;">
            <mat-form-field appearance="outline" style="flex:1; margin:0;">
              <input matInput [(ngModel)]="newMessage" placeholder="اكتب رسالتك المهنية..."
                (keydown.enter)="handleSend()">
            </mat-form-field>
            <button mat-raised-button color="primary" style="height:56px; min-width:100px;" (click)="handleSend()">
              إرسال
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  newMessage = '';

  messages: Message[] = [
    { id: 1, sender: 'الطرف الأول', text: 'تم استلام المستندات المطلوبة. جاري المراجعة.', time: '10:30 ص', isVerified: true },
    { id: 2, sender: 'الطرف الثاني', text: 'تم رفع الملفات الإضافية. يرجى التأكد من اكتمال البيانات المطلوبة.', time: '10:32 ص', isVerified: true },
    { id: 3, sender: 'الطرف الأول', text: 'الجدول الزمني المقترح مناسب. هل يمكن البدء في المرحلة الأولى؟', time: '10:35 ص', isVerified: true },
    { id: 4, sender: 'الطرف الثاني', text: 'يمكن البدء فوراً. التقنيات المستخدمة ستكون وفقاً للمواصفات المذكورة.', time: '10:37 ص', isVerified: true },
    { id: 5, sender: 'الطرف الأول', text: 'هل يمكن تعديل الجزئية الخاصة بواجهة المستخدم في التصميم المرفق؟', time: '10:40 ص', isVerified: true },
    { id: 6, sender: 'الطرف الثاني', text: 'تم تسجيل الملاحظات. سيتم تطبيق التعديلات المطلوبة في النسخة القادمة.', time: '10:43 ص', isVerified: true },
  ];

  constructor(public router: Router, private route: ActivatedRoute) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  handleSend() {
    if (this.newMessage.trim()) {
      const now = new Date();
      const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      this.messages.push({
        id: this.messages.length + 1,
        sender: 'الطرف الأول',
        text: this.newMessage.trim(),
        time,
        isVerified: true,
      });
      this.newMessage = '';
    }
  }
}
