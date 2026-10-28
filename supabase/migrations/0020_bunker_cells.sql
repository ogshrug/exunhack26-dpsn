update public.members set handle = replace(handle, 'Acolyte-', 'Bunker-') where handle like 'Acolyte-%';
