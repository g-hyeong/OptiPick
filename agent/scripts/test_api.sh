#!/bin/bash

# CompareProducts API 테스트 스크립트
# 실행: ./scripts/test_api.sh

set -e

API_URL="http://localhost:8000"
echo "Testing CompareProducts API at $API_URL"
echo "=========================================="

# 1. Health Check
echo -e "\n1. Health Check"
curl -s "$API_URL/health" | python3 -m json.tool

# 2. Start Compare Products
echo -e "\n2. Starting CompareProducts graph..."
RESPONSE=$(curl -s -X POST "$API_URL/graphs/compare-products/start" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "노트북",
    "products": [
      {
        "product_name": "맥북 프로",
        "summary": "고성능 노트북",
        "price": "3,590,000원",
        "key_features": ["M3 Max", "16GB RAM", "배터리 22시간"],
        "pros": ["강력한 성능"],
        "cons": ["높은 가격"],
        "recommended_for": "전문가",
        "recommendation_reasons": ["최고 성능"],
        "not_recommended_reasons": ["예산 부족시"]
      },
      {
        "product_name": "LG 그램",
        "summary": "초경량 노트북",
        "price": "2,290,000원",
        "key_features": ["인텔 i7", "16GB RAM", "무게 1.35kg"],
        "pros": ["가벼움"],
        "cons": ["성능 부족"],
        "recommended_for": "비즈니스",
        "recommendation_reasons": ["휴대성"],
        "not_recommended_reasons": ["고성능 필요시"]
      }
    ]
  }')

echo "$RESPONSE" | python3 -m json.tool

# thread_id 추출
THREAD_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['thread_id'])")
echo -e "\nThread ID: $THREAD_ID"

# 3. Continue - 사용자 기준 입력
echo -e "\n3. Providing user criteria..."
RESPONSE=$(curl -s -X POST "$API_URL/graphs/compare-products/$THREAD_ID/continue" \
  -H "Content-Type: application/json" \
  -d '{
    "user_input": ["성능", "무게", "가격"]
  }')

echo "$RESPONSE" | python3 -m json.tool

# criteria 추출
CRITERIA=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('criteria', []))")
echo -e "\nExtracted criteria: $CRITERIA"

# 4. Continue - 우선순위 입력
echo -e "\n4. Providing user priorities..."
RESPONSE=$(curl -s -X POST "$API_URL/graphs/compare-products/$THREAD_ID/continue" \
  -H "Content-Type: application/json" \
  -d '{
    "user_input": {
      "성능": 1,
      "무게": 2,
      "가격": 3
    }
  }')

echo "$RESPONSE" | python3 -m json.tool | head -50

echo -e "\n=========================================="
echo "Test completed successfully!"
