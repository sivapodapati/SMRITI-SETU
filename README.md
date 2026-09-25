# 🧠 SMRITI-SETU

### AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients

> A smart, accessible and culturally personalized platform designed to support cognitive engagement, memory assistance and daily activities for elderly people experiencing dementia-related challenges.

---

## 📌 About the Project

**SMRITI-SETU** is an AI-assisted cognitive support platform designed especially for elderly users.

The platform provides interactive cognitive games, memory exercises, voice assistance, daily reminders and caregiver monitoring features.

It aims to create a simple, elderly-friendly digital environment that supports cognitive engagement while helping caregivers monitor patient activities and performance.

---

## 🎯 Problem Statement

**SIH 26003**

**AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)**

The project focuses on providing:

- Cognitive stimulation
- Memory assistance
- Daily routine support
- Personalized cognitive activities
- Multilingual and voice-based interaction
- Caregiver monitoring

---

## 🚀 Key Features

### 🧩 Cognitive Games
- Memory improvement games
- Recall activities
- Attention and concentration exercises
- Pattern recognition
- Object recognition
- Daily routine recall
- Emotional and mental engagement activities

### 🤖 AI-Based Adaptation
- Performance-based difficulty adjustment
- Response-time analysis
- Score and accuracy tracking
- Engagement monitoring
- Personalized game difficulty
- Future ML-based cognitive adaptation

### 🗣️ Multilingual & Voice Assistance
- Voice-guided interactions
- Elderly-friendly conversational interface
- Regional language support
- Support for languages and dialects of North Eastern India

### 🎨 Cultural Personalization
- Regionally familiar images
- Local themes
- Traditional sounds and music
- Localized stories and narratives

### ⏰ Daily Assistance
- Medication reminders
- Hydration reminders
- Daily activity reminders
- Routine schedules
- Medical appointment alerts

### 👨‍⚕️ Caregiver Dashboard
- Patient performance monitoring
- Game performance tracking
- Activity monitoring
- Progress analysis
- Missed routine alerts
- Cognitive performance trends

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      User /         │
                    │   Elderly Patient   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Frontend       │
                    │  User Interaction   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       FastAPI       │
                    │       Backend       │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ Cognitive   │   │ Performance │   │   Reminder  │
      │   Games     │   │  Tracking   │   │   System    │
      └─────────────┘   └─────────────┘   └─────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │      Database       │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Future AI / ML      │
                    │ Difficulty Model    │
                    └─────────────────────┘
