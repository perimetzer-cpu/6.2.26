# מדריך התקנה - WhatsApp + Salesforce Integration

## סקירה כללית

המערכת מאפשרת שליחה וקבלה של הודעות WhatsApp ישירות מתוך כרטיס לקוח/איש קשר ב-Salesforce.

### ארכיטקטורה
```
Salesforce (LWC + Apex) ←→ Middleware (Node.js) ←→ Meta WhatsApp Cloud API ←→ WhatsApp
```

### עלות
- **Meta WhatsApp Cloud API**: 1,000 שיחות חינם בחודש
- **Salesforce Developer Edition**: חינם
- **Middleware hosting**: חינם (Render / Railway free tier)

---

## שלב 1: הגדרת Meta WhatsApp Cloud API

### 1.1 יצירת Meta Business Account
1. כנס ל-[Meta for Developers](https://developers.facebook.com/)
2. צור חשבון מפתח (או התחבר עם חשבון Facebook קיים)
3. לחץ **Create App** → בחר **Business** → תן שם לאפליקציה

### 1.2 הוספת WhatsApp לאפליקציה
1. בדשבורד של האפליקציה, לחץ **Add Product**
2. בחר **WhatsApp** → לחץ **Set Up**
3. תקבל:
   - **Phone Number ID** (שמור אותו)
   - **WhatsApp Business Account ID**
   - **Temporary Access Token** (שמור אותו - תקף ל-24 שעות)

### 1.3 יצירת Permanent Token
1. ב-Meta Business Settings → **System Users** → צור System User
2. תן לו הרשאות **whatsapp_business_messaging** ו-**whatsapp_business_management**
3. צור **Generate Token** → בחר את האפליקציה שלך
4. שמור את ה-Token הקבוע

### 1.4 הגדרת מספר טלפון
- לבדיקות: Meta נותן מספר טלפון לבדיקות (test number)
- לפרודקשן: צריך לחבר מספר עסקי אמיתי

---

## שלב 2: הקמת Middleware (Node.js)

### 2.1 הכנת הפרויקט
```bash
cd middleware
npm install
cp .env.example .env
```

### 2.2 עריכת קובץ .env
```env
# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=הטוקן_הקבוע_שיצרת
WHATSAPP_PHONE_NUMBER_ID=ה_PHONE_NUMBER_ID_שקיבלת
WHATSAPP_VERIFY_TOKEN=סיסמה_כלשהי_שתבחר

# Salesforce
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=המייל_שלך_בsalesforce
SF_PASSWORD=הסיסמה_שלך
SF_SECURITY_TOKEN=הsecurity_token_של_salesforce

# Middleware
API_KEY=מפתח_סודי_שתבחר_בעצמך
PORT=3000
```

### 2.3 בדיקה מקומית
```bash
npm start
# אמור לראות: WhatsApp-Salesforce middleware running on port 3000
```

### 2.4 העלאה ל-Render (חינם)
1. כנס ל-[render.com](https://render.com/) וצור חשבון
2. **New** → **Web Service**
3. חבר את ה-GitHub repo שלך
4. הגדרות:
   - **Root Directory**: `middleware`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. הוסף את כל משתני הסביבה מ-.env ב-**Environment Variables**
6. לחץ **Create Web Service**
7. שמור את ה-URL שתקבל (לדוגמה: `https://your-app.onrender.com`)

### 2.5 הגדרת Webhook ב-Meta
1. חזור לדשבורד של Meta Developer
2. WhatsApp → **Configuration** → **Webhook**
3. **Callback URL**: `https://your-app.onrender.com/webhook`
4. **Verify Token**: אותו ערך שכתבת ב-`WHATSAPP_VERIFY_TOKEN`
5. לחץ **Verify and Save**
6. ב-**Webhook Fields** סמן: `messages`

---

## שלב 3: הגדרת Salesforce

### 3.1 Deploy ל-Salesforce
```bash
cd salesforce

# התחבר לארגון
sf org login web

# Deploy
sf project deploy start
```

**או ידנית** (בלי CLI):
1. צור Custom Object בשם `WhatsApp_Message__c` עם השדות:
   - `Account__c` (Lookup → Account)
   - `Contact__c` (Lookup → Contact)
   - `Message_Body__c` (Long Text Area)
   - `Direction__c` (Picklist: Outbound, Inbound)
   - `Status__c` (Picklist: Sent, Delivered, Read, Failed)
   - `WhatsApp_Message_Id__c` (Text, External ID)
   - `Phone_Number__c` (Phone)
   - `Timestamp__c` (DateTime)

2. צור Custom Setting בשם `WhatsApp_Settings__c` (Hierarchy) עם:
   - `Middleware_URL__c` (URL)
   - `API_Key__c` (Text 255)

3. העתק את ה-Apex Classes ידנית דרך Developer Console

4. העתק את ה-LWC דרך VS Code + Salesforce Extensions

### 3.2 הגדרת Custom Settings
1. **Setup** → חפש **Custom Settings** → לחץ **Manage** ליד WhatsApp Settings
2. לחץ **New** (Organization Default)
3. מלא:
   - **Middleware URL**: `https://your-app.onrender.com` (ה-URL מ-Render)
   - **API Key**: אותו ערך שכתבת ב-`API_KEY` ב-.env

### 3.3 הגדרת Remote Site Settings
1. **Setup** → חפש **Remote Site Settings**
2. **New Remote Site**:
   - **Name**: WhatsApp_Middleware
   - **URL**: `https://your-app.onrender.com`
   - סמן **Active**

### 3.4 הוספת הקומפוננטה לדף הלקוח
1. פתח כרטיס Account או Contact כלשהו
2. לחץ על גלגל השיניים (⚙️) → **Edit Page**
3. ב-Lightning App Builder, גרור את **WhatsApp Chat** לצד ימין של הדף
4. לחץ **Save** → **Activate** → **Assign as Org Default**

---

## שלב 4: בדיקה

### 4.1 בדיקת שליחה
1. פתח כרטיס לקוח עם מספר טלפון
2. כתוב הודעה בחלון הצ'אט
3. לחץ **Send**
4. ההודעה אמורה להגיע ל-WhatsApp של הלקוח

### 4.2 בדיקת קבלה
1. שלח הודעה מ-WhatsApp למספר העסקי
2. ההודעה אמורה להופיע בכרטיס הלקוח ב-Salesforce

### 4.3 פתרון בעיות
- **הודעה לא נשלחת**: בדוק ב-Render logs שה-middleware רץ
- **401 Unauthorized**: ודא שה-API Key זהה ב-Salesforce וב-middleware
- **WhatsApp API error**: ודא שה-Token תקף ושהמספר מאושר
- **לא מקבל הודעות**: ודא שה-Webhook מוגדר נכון ב-Meta

---

## הערות חשובות

### מגבלות WhatsApp Business API
- **חלון 24 שעות**: אחרי שלקוח שולח הודעה, יש לך 24 שעות לענות עם הודעת טקסט חופשי
- **מחוץ לחלון**: צריך להשתמש בתבניות מאושרות מראש (Template Messages)
- **1,000 שיחות חינם**: זה מספיק לעסק קטן-בינוני

### אבטחה
- לעולם אל תשתף את ה-API Key או WhatsApp Token
- ה-Custom Setting מסוג Protected - רק Admins רואים
- ה-middleware מוגן עם rate limiting ו-helmet

### Render Free Tier
- השרת "נרדם" אחרי 15 דקות ללא פעילות
- ההודעה הראשונה אחרי "שינה" לוקחת ~30 שניות
- לפרודקשן, שקול לשדרג לתוכנית בתשלום ($7/חודש)
