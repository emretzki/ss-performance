-- Enable realtime change streaming on sessions so every screen sees new/edited
-- sessions the instant a trainer enters one (the "herkes görebilmeli" rule).
alter publication supabase_realtime add table sessions;
