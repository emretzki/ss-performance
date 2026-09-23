-- Owners pay PT commission on a cycle that rarely lines up with the
-- calendar month (paydays like the 15th or the 20th are common). Reports
-- previously always computed "bu ay" as a hard calendar month, which made
-- the commission figures look wrong to an owner planning an actual payout.
-- This lets each organization set the day its commission period starts on;
-- the period then runs [start_day, next start_day) regardless of month
-- length, wrapping day 29-31 payout days down to 28 so every month has one.
alter table organizations
  add column commission_period_start_day smallint not null default 1
  constraint organizations_commission_period_start_day_range check (commission_period_start_day between 1 and 28);
