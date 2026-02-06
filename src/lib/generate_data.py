'''
import json
import datetime
import random

def generate_yearly_data():
    profile = {
      "system_settings": {
        "user_profile": {
          "name": "田中 優",
          "avatar_url": "/avatars/user_avatar_2.jpg"
        },
        "app_constants": {
          "target_weight_kg": 75
        }
      },
      "workout_schedule": [
        "rest",
        "wk_001_push",
        "wk_002_pull",
        "rest",
        "wk_003_legs",
        "wk_001_push",
        "rest"
      ],
      "workout_library": [
        {
          "workout_id": "wk_001_push",
          "workout_name": "プッシュデー (胸/肩/三頭筋)",
          "exercises": [
            { "exercise_id": "ex_001", "exercise_name": "ベンチプレス" },
            { "exercise_id": "ex_002", "exercise_name": "オーバーヘッドプレス" },
            { "exercise_id": "ex_003", "exercise_name": "ディップス" }
          ]
        },
        {
          "workout_id": "wk_002_pull",
          "workout_name": "プルデー (背中/二頭筋)",
          "exercises": [
            { "exercise_id": "ex_004", "exercise_name": "懸垂" },
            { "exercise_id": "ex_005", "exercise_name": "ベントオーバーロウ" },
            { "exercise_id": "ex_006", "exercise_name": "バーベルカール" }
          ]
        },
        {
          "workout_id": "wk_003_legs",
          "workout_name": "レッグデー (脚)",
          "exercises": [
            { "exercise_id": "ex_007", "exercise_name": "スクワット" },
            { "exercise_id": "ex_008", "exercise_name": "デッドリフト" },
            { "exercise_id": "ex_009", "exercise_name": "レッグプレス" }
          ]
        }
      ],
      "daily_logs": []
    }

    today = datetime.date.today()
    current_date = today - datetime.timedelta(days=365)
    start_weight = 88.0
    target_weight = profile["system_settings"]["app_constants"]["target_weight_kg"]
    weight_loss_per_day = (start_weight - target_weight - 2) / 365.0
    current_weight = start_weight

    daily_logs = []
    while current_date <= today:
        day_log = {"date": current_date.isoformat()}
        has_content = False

        if random.random() < 0.75:
            weight_fluctuation = random.uniform(-0.5, 0.5)
            day_log["health_metrics"] = {
                "weight_kg": round(current_weight + weight_fluctuation, 1)
            }
            has_content = True

        schedule_index = (current_date.weekday() + 1) % 7
        workout_id = profile["workout_schedule"][schedule_index]
        if workout_id != "rest" and random.random() < 0.8:
            workout_plan = next((w for w in profile["workout_library"] if w["workout_id"] == workout_id), None)
            if workout_plan:
                day_log["workout_performed"] = [{
                    "exercise_id": ex["exercise_id"],
                    "effective_reps": random.randint(8, 12),
                    "sets_performed": [{"reps": random.randint(8, 12), "weight": round(random.uniform(40, 100) / 2.5) * 2.5} for _ in range(3)]
                } for ex in workout_plan["exercises"]]
                has_content = True

        if random.random() < 0.6:
            foods = ["プロテインシェイク", "鶏胸肉", "ブロッコリー", "白米", "サーモン"]
            day_log["food_intake"] = [{"food_name": random.choice(foods), "calories": random.randint(100, 500)}]
            has_content = True
            
        if has_content:
            daily_logs.append(day_log)

        current_weight -= weight_loss_per_day
        current_date += datetime.timedelta(days=1)

    profile["daily_logs"] = sorted(daily_logs, key=lambda x: x['date'])

    with open('src/lib/pms-profile.json', 'w', encoding='utf-8') as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    generate_yearly_data()
'''