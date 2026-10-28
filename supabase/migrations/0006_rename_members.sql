update public.members set handle = replace(handle, 'Azure-', 'Acolyte-') where handle like 'Azure-%';
