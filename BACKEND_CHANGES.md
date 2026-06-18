# Backend Changes Required for Payment Audit Trail Feature

## Overview
This document describes the backend changes needed to implement the audit trail feature for payments. The backend must track which user created each payment and return their role.

## Database Schema Changes

### 1. Update Payment Model
Add two new fields to the `Payment` model in `app/models.py`:

```python
class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    payment_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # NEW FIELDS
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)  # Nullable for existing payments
    created_by_role = Column(String, nullable=True)  # Nullable for existing payments
```

### 2. Database Migration
Create and run a migration to add the new columns:

```bash
# Using Alembic
alembic revision -m "add_payment_creator_tracking"
# Edit the migration file to add the columns
alembic upgrade head
```

**Migration SQL (if not using Alembic):**
```sql
ALTER TABLE payments ADD COLUMN created_by_id VARCHAR;
ALTER TABLE payments ADD COLUMN created_by_role VARCHAR;
```

## API Endpoint Changes

### 3. Update POST /api/payments/
Modify the payment creation endpoint in `app/routers/payments.py`:

```python
from app.dependencies import get_current_user
from app.models import User

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user)  # Get authenticated user from JWT
):
    """
    Create a new payment and track who created it
    """
    new_payment = Payment(
        tenant_id=payment.tenant_id,
        payment_date=payment.payment_date,
        amount=payment.amount,
        created_by_id=current_user.id,  # Store creator's user ID
        created_by_role=current_user.role  # Store creator's role (from JWT)
    )

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return new_payment
```

### 4. Update Pydantic Response Schemas
In `app/schemas.py`, add the new fields to the PaymentResponse schema:

```python
class PaymentResponse(BaseModel):
    id: str
    tenant_id: str
    payment_date: date
    amount: float
    created_at: datetime
    created_by_id: Optional[str] = None  # Will be None for old payments
    created_by_role: Optional[str] = None  # Will be None for old payments

    class Config:
        orm_mode = True
```

### 5. Update GET /api/payments/ and GET /api/payments/{id}
No changes needed - if the PaymentResponse schema includes the fields, they will automatically be returned.

## Authentication Dependency

### 6. Verify get_current_user Dependency
Ensure `app/dependencies.py` has a function that extracts the user from the JWT:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_database)
) -> User:
    """
    Extract and validate user from JWT token
    Returns the full User object from the database
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    # Fetch user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user
```

## Testing

### 7. Test the Changes

**Test 1: Create a new payment as Admin**
```bash
curl -X POST https://api.takamul-cars.com/api/payments/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "some-tenant-id",
    "payment_date": "2026-06-18",
    "amount": 5000
  }'
```

Expected response should include:
```json
{
  "id": "...",
  "tenant_id": "...",
  "payment_date": "2026-06-18",
  "amount": 5000,
  "created_by_id": "admin-user-id",
  "created_by_role": "admin"
}
```

**Test 2: Verify existing payments don't crash**
```bash
curl -X GET https://api.takamul-cars.com/api/payments/ \
  -H "Authorization: Bearer {token}"
```

Expected: Old payments should have `created_by_id: null` and `created_by_role: null`

**Test 3: Create payment as Rent Collector**
Same as Test 1, but use a rent_collector token. Verify `created_by_role: "rent_collector"`

## Security Notes

⚠️ **Important Security Considerations:**
- The `created_by_id` and `created_by_role` MUST be set from the authenticated user (JWT), NOT from the request body
- Never trust role information sent from the client
- The user info comes from `get_current_user(current_user)`, which validates the JWT
- Old payments without creator info should gracefully return `null` values, not crash

## Deployment Checklist

- [ ] Update database schema (add columns)
- [ ] Run migrations
- [ ] Update Payment model
- [ ] Update PaymentResponse schema
- [ ] Modify POST /api/payments/ to capture creator info
- [ ] Test with admin, rent_collector, and spectator roles
- [ ] Verify old payments still work (null values)
- [ ] Deploy to production
- [ ] Update API documentation (if using Swagger/OpenAPI)

## Frontend Changes (Already Implemented)

The frontend has been updated to:
- Display a colored badge showing the creator's role next to each payment
- Handle old payments gracefully (no badge if `created_by_role` is null)
- Show "Admin", "Rent Collector", or "Unknown" based on the role

**Example Display:**
```
AED 5,000
15 Mar 2026
by [Admin]  ← Blue badge
```
