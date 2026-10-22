"""Toby's existing 640×400 drag-to-Applications installer composition."""
import os
application=os.path.abspath(defines['app'])
files=[application]
symlinks={'Applications':'/Applications'}
format='UDZO'
filesystem='HFS+'
background=os.path.abspath(defines['background'])
icon=os.path.join(application,'Contents','Resources','assets','Toby.icns')
window_rect=((160,160),(640,400))
default_view='icon-view'
show_status_bar=False
show_tab_view=False
show_toolbar=False
show_pathbar=False
show_sidebar=False
include_icon_view_settings=True
include_list_view_settings=False
arrange_by=None
icon_locations={os.path.basename(application):(170,230),'Applications':(470,230)}
icon_size=88
text_size=13
label_pos='bottom'
show_icon_preview=False
hide_extensions=[]
