from setuptools import setup, find_packages
import os

setup(
  name='feedreader',
  version='1.0',
  author="Jackie Murphy",
  author_email="jackie.murphy@gmail.com",
  description="Feedreader",
  packages=find_packages(),
  package_dir={'': os.sep.join(['src'])},
  include_package_data=True,
  install_requires=[
    'feedparser',
    'simplejson==2.1.3',
  ],
)
